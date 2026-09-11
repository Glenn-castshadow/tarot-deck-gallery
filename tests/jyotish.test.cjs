const test=require('node:test');
const assert=require('node:assert/strict');
const J=require('../jyotish-engine.js');
const natal=require('../natal-engine.js');

test('tables: 27 nakshatras with lords cycling through nine grahas, 12 rashis, 120 dasha years',()=>{
  assert.equal(J.nakshatras.length,27);
  assert.deepEqual(J.nakshatras.slice(0,3).map(n=>n.name),['Ashwini','Bharani','Krittika']);
  assert.equal(J.nakshatras[26].name,'Revati');
  assert.deepEqual(J.lordCycle,['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury']);
  assert.deepEqual(J.nakshatras.map(n=>n.lord),Array.from({length:27},(_,i)=>J.lordCycle[i%9]));
  assert.equal(Object.values(J.dashaYears).reduce((a,b)=>a+b),120);
  assert.equal(J.rashis.length,12);assert.deepEqual(J.rashis[0],['Mesha','Aries']);assert.deepEqual(J.rashis[11],['Meena','Pisces']);
  assert.ok(J.nakshatras.every(n=>n.deity&&n.symbol));
});

test('ayanamsa: Lahiri reference at t0 and a plausible value at J2000',()=>{
  assert.ok(Math.abs(J.ayanamsa(new Date(Date.UTC(1956,2,21)))-J.AYANAMSA_T0)<1e-6);
  const y2000=J.ayanamsa(new Date('2000-01-01T12:00:00Z'));
  assert.ok(y2000>23.84&&y2000<23.87,`J2000 ayanamsa ${y2000}`);
  assert.ok(J.ayanamsa(new Date('2100-01-01T00:00:00Z'))-y2000>1.35,'about 50.3″ per year');
  assert.throws(()=>J.ayanamsa('2000-01-01'),RangeError);
});

test('nakshatra and pada from a sidereal longitude',()=>{
  assert.deepEqual([J.nakshatraOf(0).name,J.nakshatraOf(0).pada],['Ashwini',1]);
  assert.deepEqual([J.nakshatraOf(10).name,J.nakshatraOf(10).pada],['Ashwini',4]);
  assert.deepEqual([J.nakshatraOf(13.3334).name,J.nakshatraOf(13.3334).pada,J.nakshatraOf(13.3334).lord],['Bharani',1,'Venus']);
  assert.deepEqual([J.nakshatraOf(359.9).name,J.nakshatraOf(359.9).pada,J.nakshatraOf(359.9).lord],['Revati',4,'Mercury']);
  assert.ok(Math.abs(J.nakshatraOf(10).fraction-0.75)<1e-9);
  assert.equal(J.nakshatraOf(360).name,'Ashwini');
});

test('navamsa sign follows the movable/fixed/dual starting rule for every sign and part',()=>{
  const start=s=>[0,1,2][s%3]===0?s:[0,1,2][s%3]===1?(s+8)%12:(s+4)%12; // movable: itself; fixed: ninth; dual: fifth
  for(let s=0;s<12;s++) for(let k=0;k<9;k++) assert.equal(J.navamsaSign(s*30+k*(30/9)+0.001),(start(s)+k)%12,`sign ${s} part ${k}`);
  assert.equal(J.navamsaSign(0),0);assert.equal(J.navamsaSign(3.34),1);assert.equal(J.navamsaSign(30),9);assert.equal(J.navamsaSign(60),6);assert.equal(J.navamsaSign(359.9),11);
});

test('sidereal placements: lagna, whole-sign bhavas, grahas with nakshatras and navamsa, missing passthrough',()=>{
  const chart=natal.calculate({birthday:'1990-07-15',time:'14:30',location:{latitude:40.7143,longitude:-74.006,timeZone:'America/New_York'}});
  const m=J.sidereal(chart);
  assert.equal(m.status,'ready');
  const ayan=J.ayanamsa(new Date(chart.date));
  const tropicalSun=chart.points.find(p=>p.name==='Sun').longitude;
  assert.ok(Math.abs(natal.delta(m.grahas[0].longitude,tropicalSun-ayan))<1e-9);
  assert.deepEqual(m.grahas.map(g=>g.name),['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']);
  assert.ok(m.grahas.every(g=>g.house>=1&&g.house<=12&&g.nakshatra.name&&g.navamsaSign>=0));
  assert.equal(m.grahas.find(g=>g.name==='Rahu').retrograde,true);
  assert.equal(m.houses.length,12);assert.equal(m.houses[0].signIndex,m.lagna.signIndex);
  assert.equal(m.houses[6].signIndex,(m.lagna.signIndex+6)%12);
  for(const g of m.grahas) assert.equal(m.houses[g.house-1].signIndex,g.signIndex,'bhava matches sign');
  for(const g of m.grahas) assert.equal(g.vargottama,g.signIndex===g.navamsaSign);
  assert.equal(m.navamsaLagna.signIndex,J.navamsaSign(m.lagna.longitude));
  assert.equal(J.sidereal(null).status,'missing');
  assert.equal(J.sidereal({status:'missing',message:'x'}).status,'missing');
});

const reference=require('./fixtures/jyotish-reference.json');
for(const c of reference.cases) test(`swiss ephemeris reference: ${c.id}`,()=>{
  const chart=natal.calculate({...c.input, houseSystem:'whole-sign'});
  assert.equal(chart.status,'ready');
  const date=new Date(chart.date);
  assert.ok(Math.abs(J.ayanamsa(date)-c.ayanamsa)<0.005,`ayanamsa ${J.ayanamsa(date)} vs ${c.ayanamsa}`);
  const m=J.sidereal(chart);
  for(const g of m.grahas) assert.ok(Math.abs(natal.delta(g.longitude,c.points[g.name]))<0.03,`${g.name} ${g.longitude} vs ${c.points[g.name]}`);
  assert.ok(Math.abs(natal.delta(m.lagna.longitude,c.asc))<0.03,'lagna');
  for(const g of m.grahas) {
    const r=c.rules[g.name];
    // A graha within 0.03° of a nakshatra, pada or navamsa boundary may legitimately fall either side; skip those.
    const nearBoundary=(span)=>{const w=natal.mod(g.longitude)%span;return w<0.03||span-w<0.03;};
    if(!nearBoundary(360/27)) assert.equal(g.nakshatra.index,r.nakshatra,`${g.name} nakshatra`);
    if(!nearBoundary(360/108)) assert.equal(g.nakshatra.pada,r.pada,`${g.name} pada`);
    if(!nearBoundary(30/9)) assert.equal(g.navamsaSign,r.navamsa,`${g.name} navamsa`);
  }
});
test('the swiss ayanamsa at t0 matches the engine reference constant',()=>{
  assert.ok(Math.abs(reference.ayanamsaAtT0-J.AYANAMSA_T0)<0.0005);
});

function syntheticChart(moonSidereal, dateIso='2000-01-01T12:00:00Z') {
  const ayan=J.ayanamsa(new Date(dateIso));
  const pt=(name,lon,kind='planet')=>({name,kind,longitude:natal.mod(lon+ayan),retrograde:false});
  return {status:'ready',date:dateIso,points:[pt('Sun',100),pt('Moon',moonSidereal),pt('Mars',200),pt('Mercury',110),pt('Jupiter',20),pt('Venus',80),pt('Saturn',300),pt('North Node',250,'node'),pt('South Node',70,'node')],axes:[{name:'Ascendant',longitude:natal.mod(15+ayan)},{name:'Midheaven',longitude:natal.mod(285+ayan)}]};
}
test('vimshottari: balance, sequence, antardasha sums and the current period',()=>{
  const d=J.vimshottari(syntheticChart(10),'2005-06-01'); // Moon 10° Ashwini, 75% elapsed → Ketu balance 1.75 years
  assert.equal(d.status,'ready');assert.equal(d.moonNakshatra.name,'Ashwini');
  assert.ok(Math.abs(d.balanceYears-1.75)<1e-9);
  assert.deepEqual(d.mahadashas.map(m=>m.lord),['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury']);
  assert.equal(d.mahadashas[0].start,'2000-01-01T12:00:00.000Z','first mahadasha starts at birth');
  const day=86400000;
  assert.ok(Math.abs(new Date(d.mahadashas[0].end)-new Date('2000-01-01T12:00:00Z')-1.75*365.25*day)<1000);
  assert.ok(Math.abs(new Date(d.mahadashas[1].end)-new Date(d.mahadashas[1].start)-20*365.25*day)<1000);
  for(const m of d.mahadashas) {
    assert.equal(m.antardashas.length,9);assert.equal(m.antardashas[0].lord,m.lord);
    assert.ok(Math.abs(m.antardashas.reduce((s,a)=>s+a.years,0)-m.years)<1e-9);
    assert.ok(Math.abs(m.antardashas[0].years-m.years*J.dashaYears[m.lord]/120)<1e-9);
  }
  assert.ok(d.mahadashas[0].antardashas.some(a=>a.beforeBirth),'the first mahadasha has antardashas that ended before birth');
  assert.equal(d.current.maha,1,'2005 falls in the Venus mahadasha');
  assert.ok(d.current.antar>=0&&d.current.antar<9);
  assert.equal(J.vimshottari(syntheticChart(10),'1999-12-31').current,null);
  assert.equal(J.vimshottari(syntheticChart(10),'2200-01-01').current,null);
  assert.equal(J.vimshottari(null,'2005-06-01').status,'missing');
});
for(const c of reference.cases) test(`swiss-derived dasha reference: ${c.id}`,()=>{
  const chart=natal.calculate({...c.input, houseSystem:'whole-sign'});
  const d=J.vimshottari(chart,'2026-09-12');
  const moon=J.sidereal(chart).grahas.find(g=>g.name==='Moon');
  const w=moon.longitude%(360/27); if(w<0.03||360/27-w<0.03) return; // boundary case: lord may differ legitimately
  assert.equal(d.mahadashas[0].lord,c.dasha.firstLord);
  // The tropical engine (Astronomy Engine) already tolerates up to 0.03° of Moon-longitude
  // disagreement with Swiss Ephemeris elsewhere in this file. Vimshottari amplifies any such
  // difference e (degrees) by firstLordYears / nakshatraSpan, since a nakshatra spans 360/27°
  // and the whole dasha timeline is shifted by that fraction of the first lord's years. That
  // shift is a constant offset carried through every later mahadasha (their durations are fixed
  // dashaYears, not Moon-sensitive), so the same bound applies to the balance and to every
  // mahadasha end date. Worst case (a 20-year lord at the full 0.03°) is about 16 days; +1 day
  // covers rounding/date-boundary effects.
  const lordYears=J.dashaYears[c.dasha.firstLord];
  const allowedDays=0.03/(360/27)*lordYears*365.25+1;
  assert.ok(Math.abs(d.balanceYears-c.dasha.balanceYears)*365.25<=allowedDays,`balance within ${allowedDays.toFixed(1)} days`);
  d.mahadashas.forEach((m,i)=>{assert.equal(m.lord,c.dasha.mahadashas[i].lord);assert.ok(Math.abs(new Date(m.end)-new Date(c.dasha.mahadashas[i].end))<=allowedDays*86400000,`mahadasha ${i} end within ${allowedDays.toFixed(1)} days`);});
});
for(const c of reference.cases) test(`vimshottari arithmetic matches the fixture exactly when fed its own Moon longitude: ${c.id}`,()=>{
  // Isolates the dasha *rule* from Moon-ephemeris disagreement: build a synthetic chart whose
  // sidereal Moon longitude is the fixture's own points.Moon (not this engine's tropical-minus-
  // ayanamsa computation), the same way the synthetic test above builds charts. With the Moon
  // position pinned to the fixture's value, the first mahadasha's end should match Swiss to well
  // under a second.
  const chart=syntheticChart(c.points.Moon,c.utc);
  const d=J.vimshottari(chart,c.utc.slice(0,10));
  assert.equal(d.mahadashas[0].lord,c.dasha.firstLord);
  assert.ok(Math.abs(new Date(d.mahadashas[0].end)-new Date(c.dasha.mahadashas[0].end))<60000,'first mahadasha end within 60 seconds');
});
