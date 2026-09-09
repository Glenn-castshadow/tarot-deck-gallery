/* Transit, synastry and Four Pillars calculations; no network calls or prediction scores. */
const CelestialExtrasEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const names = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  const symbols = ['☉','☾','☿','♀','♂','♃','♄','♅','♆','♇'];
  function positions(dateValue) {
    const date = new Date(dateValue);
    if (!Number.isFinite(+date) || date.getUTCFullYear()<1901 || date.getUTCFullYear()>2100) throw Error('Choose a date from 1901 to 2100.');
    return names.map((name,i) => {
      const longitude = astro.Ecliptic(astro.GeoVector(name,date,true)).elon;
      return {name,symbol:symbols[i],kind:'planet',...natal.placement(longitude)};
    });
  }
  function between(first, second, mode='synastry') {
    const contacts = [];
    for (const a of first) for (const b of second) {
      const separation = Math.abs(natal.delta(a.longitude,b.longitude));
      for (const type of natal.aspectTypes) {
        const limit = mode === 'transit' ? 2 : Math.min(6,type.orb);
        const orb = Math.abs(separation-type.angle);
        if (orb<=limit) contacts.push({id:`${a.name}-${b.name}-${type.name}`,a:a.name,b:b.name,type:type.name,symbol:type.symbol,angle:type.angle,orb,limit,aLongitude:a.longitude,bLongitude:b.longitude});
      }
    }
    return contacts.sort((a,b)=>a.orb-b.orb || a.id.localeCompare(b.id));
  }
  function transits(chart, day) {
    if (chart?.status !== 'ready') return {status:'missing',message:'Add your birth time and a confirmed birthplace above to compare today’s sky with your birth chart.'};
    const parsed = new Date(`${day}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !Number.isFinite(+parsed) || parsed.toISOString().slice(0,10)!==day) throw Error('Choose a valid calendar date.');
    const date = `${day}T12:00:00.000Z`, points = positions(date);
    const birth = chart.points.filter(p=>p.kind==='planet');
    return {status:'ready',date,points,birth,contacts:between(points,birth,'transit')};
  }
  function synastry(first, second) {
    if (first?.status !== 'ready' || second?.status !== 'ready') return {status:'missing',message:'Both people need a birth date, recorded time and confirmed birthplace.'};
    const a = first.points.filter(p=>p.kind==='planet'), b = second.points.filter(p=>p.kind==='planet');
    return {status:'ready',first:a,second:b,contacts:between(a,b),overlays:b.map(p=>({name:p.name,house:natal.houseFor(p.longitude,first.cusps)}))};
  }
  const stems = [
    ['甲','Jia','Wood','Yang'],['乙','Yi','Wood','Yin'],['丙','Bing','Fire','Yang'],['丁','Ding','Fire','Yin'],['戊','Wu','Earth','Yang'],
    ['己','Ji','Earth','Yin'],['庚','Geng','Metal','Yang'],['辛','Xin','Metal','Yin'],['壬','Ren','Water','Yang'],['癸','Gui','Water','Yin']
  ];
  const branches = [
    ['子','Zi','Rat','Water'],['丑','Chou','Ox','Earth'],['寅','Yin','Tiger','Wood'],['卯','Mao','Rabbit','Wood'],['辰','Chen','Dragon','Earth'],['巳','Si','Snake','Fire'],
    ['午','Wu','Horse','Fire'],['未','Wei','Goat','Earth'],['申','Shen','Monkey','Metal'],['酉','You','Rooster','Metal'],['戌','Xu','Dog','Earth'],['亥','Hai','Pig','Water']
  ];
  function pillar(label, stemIndex, branchIndex) {
    return {label,stemIndex,branchIndex,stem:stems[stemIndex],branch:branches[branchIndex],characters:stems[stemIndex][0]+branches[branchIndex][0]};
  }
  function bazi(chart) {
    if (chart?.status !== 'ready') return {status:'missing',message:'Add a birth date, recorded time and confirmed birthplace to calculate all four pillars.'};
    const [year,month,day] = chart.birthday.split('-').map(Number), hour = Number(chart.time.split(':')[0]);
    const sunLongitude = astro.Ecliptic(astro.GeoVector('Sun',new Date(chart.date),true)).elon;
    const solarYear = year - (month === 1 || (month === 2 && sunLongitude < 315) ? 1 : 0);
    const yearIndex = natal.mod(solarYear-1984,60);
    const monthIndex = Math.floor(natal.mod(sunLongitude-315)/30);
    const julianDayNumber = Math.floor(Date.UTC(year,month-1,day)/86400000)+2440588;
    // Zi hour begins at 23:00. This release uses the 23:00 day-rollover convention.
    const dayIndex = natal.mod(julianDayNumber+49+(hour===23 ? 1 : 0),60);
    const hourBranch = Math.floor((hour+1)/2)%12;
    const pillars = [pillar('Year',yearIndex%10,yearIndex%12),pillar('Month',((yearIndex%10)%5*2+2+monthIndex)%10,(monthIndex+2)%12),pillar('Day',dayIndex%10,dayIndex%12),pillar('Hour',((dayIndex%10)%5*2+hourBranch)%10,hourBranch)];
    const phases = {Wood:0,Fire:0,Earth:0,Metal:0,Water:0};
    pillars.forEach(p=>{phases[p.stem[2]]++;phases[p.branch[3]]++;});
    const boundaryDistance = Math.min(natal.mod(sunLongitude-315,30),30-natal.mod(sunLongitude-315,30));
    return {status:'ready',pillars,phases,dayMaster:stems[dayIndex%10],solarYear,sunLongitude,nearSolarTerm:boundaryDistance<.02,lateZi:hour===23};
  }
  return {positions,between,transits,synastry,bazi,stems,branches};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CelestialExtrasEngine;
