/* Tropical geocentric natal calculations. Astronomy Engine is vendored under MIT. */
const NatalEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const D=Math.PI/180, mod=(value,base=360)=>((value%base)+base)%base;
  const delta=(a,b)=>mod(a-b+180)-180;
  const planetNames=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  const symbols=['☉','☾','☿','♀','♂','♃','♄','♅','♆','♇'];
  const signNames=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const signGlyphs=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const elements=['Fire','Earth','Air','Water'], qualities=['Cardinal','Fixed','Mutable'];
  const aspectTypes=[{name:'Conjunction',angle:0,orb:8,symbol:'☌',tone:'fusion'},{name:'Sextile',angle:60,orb:4,symbol:'⚹',tone:'opportunity'},{name:'Square',angle:90,orb:6,symbol:'□',tone:'friction'},{name:'Trine',angle:120,orb:6,symbol:'△',tone:'flow'},{name:'Opposition',angle:180,orb:8,symbol:'☍',tone:'balance'}];
  function placement(longitude) {
    const value=mod(longitude), index=Math.floor(value/30), minutes=Math.floor((value%30)*60+1e-7);
    return {index,sign:signNames[index],glyph:signGlyphs[index],element:elements[index%4],quality:qualities[index%3],degrees:`${Math.floor(minutes/60)}°${String(minutes%60).padStart(2,'0')}′`,longitude:value};
  }
  function localTimeCandidates(birthday,time,timeZone) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(birthday || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) throw Error('Enter a valid birth date and birth time.');
    const naive=new Date(`${birthday}T${time}:00Z`);
    if(!Number.isFinite(+naive) || naive.toISOString().slice(0,16)!==`${birthday}T${time}`) throw Error('Enter a valid calendar date.');
    if(naive.getUTCFullYear()<1901 || naive.getUTCFullYear()>2100) throw Error('Natal calculations support dates from 1901 to 2100.');
    let format;
    try {format=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});} catch {throw Error('Choose a city with a valid time zone, or enter an IANA time zone manually.');}
    function fieldsAt(ms) {return Object.fromEntries(format.formatToParts(new Date(ms)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));}
    const offsets=new Set();
    for(let hours=-36;hours<=36;hours+=6) {
      const sample=+naive+hours*3600000, f=fieldsAt(sample);
      offsets.add(Date.UTC(f.year,f.month-1,f.day,f.hour,f.minute,f.second)-sample);
    }
    const target=naive.toISOString().slice(0,19);
    return [...offsets].map(offset=>({utc:new Date(+naive-offset),offsetMinutes:offset/60000})).filter(item=>{
      const f=fieldsAt(+item.utc);
      return new Date(Date.UTC(f.year,f.month-1,f.day,f.hour,f.minute,f.second)).toISOString().slice(0,19)===target;
    }).sort((a,b)=>+a.utc-+b.utc);
  }
  function anglesAt(date,latitude,longitude) {
    const time=astro.MakeTime(date);
    const pole=astro.RotateVector(astro.Rotation_EQD_ECT(time),new astro.Vector(0,0,1,time));
    const obliquity=Math.atan2(Math.abs(pole.y),pole.z)/D, eps=obliquity*D;
    const ramc=mod(astro.SiderealTime(time)*15+longitude), theta=ramc*D;
    const asc=mod(Math.atan2(-Math.cos(theta),Math.sin(theta)*Math.cos(eps)+Math.tan(latitude*D)*Math.sin(eps))/D+180);
    const mc=mod(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(eps))/D);
    return {asc,mc,dc:mod(asc+180),ic:mod(mc+180),ramc,obliquity};
  }
  function houseCusps(angles,latitude,system='placidus') {
    const {asc,mc,ramc,obliquity}=angles;
    if(system==='whole-sign') return Array.from({length:12},(_,i)=>mod(Math.floor(asc/30)*30+i*30));
    if(system==='equal') return Array.from({length:12},(_,i)=>mod(asc+i*30));
    if(system!=='placidus') throw Error('Unknown house system.');
    if(Math.abs(latitude)>=90-obliquity) return null;
    // Placidus divides the semi-diurnal/nocturnal arcs into thirds. Solve the
    // ecliptic point's right ascension and declination together by bisection.
    function solve(base,fraction) {
      function residual(longitude) {
        const l=longitude*D, eps=obliquity*D;
        const ra=mod(Math.atan2(Math.sin(l)*Math.cos(eps),Math.cos(l))/D-ramc);
        const dec=Math.asin(Math.sin(eps)*Math.sin(l));
        const argument=-Math.tan(latitude*D)*Math.tan(dec);
        if(Math.abs(argument)>1) return NaN;
        const semiarc=Math.acos(argument)/D;
        return ra-(base+fraction*semiarc);
      }
      let lo=mc+1e-7,hi=mc+180-1e-7;
      if(!(residual(lo)<0 && residual(hi)>0)) return NaN;
      for(let i=0;i<64;i++) {const mid=(lo+hi)/2; if(residual(mid)>0) hi=mid; else lo=mid;}
      return mod((lo+hi)/2);
    }
    const c11=solve(0,1/3),c12=solve(0,2/3),c2=solve(60,2/3),c3=solve(120,1/3);
    const cusps=[asc,c2,c3,mod(mc+180),mod(c11+180),mod(c12+180),mod(asc+180),mod(c2+180),mod(c3+180),mc,c11,c12];
    if(cusps.some(value=>!Number.isFinite(value))) return null;
    const span=cusps.reduce((sum,value,index)=>sum+mod(cusps[(index+1)%12]-value),0);
    return Math.abs(span-360)<1e-5 ? cusps : null;
  }
  function houseFor(longitude,cusps) {
    for(let index=0;index<12;index++) if(mod(longitude-cusps[index])<mod(cusps[(index+1)%12]-cusps[index])) return index+1;
    return null;
  }
  function longitudeAt(name,date) {return astro.Ecliptic(astro.GeoVector(name,date,true)).elon;}
  function aspectsFor(points,orbScale=1) {
    const aspects=[];
    for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
      const a=points[i],b=points[j];
      // The nodal axis is inherently opposite; report its contacts with planets instead.
      if((a.kind==='node' && b.kind==='node') || (a.kind==='angle' && b.kind==='angle')) continue;
      const separation=Math.abs(delta(a.longitude,b.longitude));
      for(const type of aspectTypes) {
        const orb=Math.abs(separation-type.angle),limit=type.orb*orbScale;
        if(orb<=limit) {
          const later=Math.abs(delta(a.longitude+a.speed/24,b.longitude+b.speed/24));
          aspects.push({id:`${a.name}-${b.name}-${type.name}`,a:a.name,b:b.name,type:type.name,angle:type.angle,symbol:type.symbol,tone:type.tone,orb,limit,applying:a.kind==='angle'||b.kind==='angle'?null:Math.abs(later-type.angle)<orb});
        }
      }
    }
    return aspects.sort((a,b)=>a.orb-b.orb);
  }
  function chartAtInstant(date,location,{houseSystem='placidus',orbScale=1}={}) {
    if(!['placidus','whole-sign','equal'].includes(houseSystem)) houseSystem='placidus';
    if(![0.75,1,1.25].includes(Number(orbScale))) orbScale=1;
    orbScale=Number(orbScale);
    if(!(date instanceof Date) || !Number.isFinite(+date)) return {status:'error',message:'A valid instant is required.'};
    // A supported local birth date may resolve to an adjacent UTC calendar year.
    if(+date<Date.UTC(1900,11,31) || +date>=Date.UTC(2101,0,2)) return {status:'error',message:'Calculations support dates from 1901 to 2100.'};
    if(!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude)>=90 || Math.abs(location.longitude)>180 || !location.timeZone) return {status:'missing',message:'Select a city suggestion, or enter coordinates and a time zone, to calculate this chart.'};
    const angles=anglesAt(date,location.latitude,location.longitude);
    let cusps=houseCusps(angles,location.latitude,houseSystem),notice='';
    if(!cusps) {houseSystem='whole-sign'; cusps=houseCusps(angles,location.latitude,houseSystem); notice='Placidus is unavailable at this latitude/time. This chart uses Whole Sign houses.';}
    const before=new Date(+date-43200000),after=new Date(+date+43200000);
    const points=planetNames.map((name,index)=>{
      const longitude=longitudeAt(name,date),speed=delta(longitudeAt(name,after),longitudeAt(name,before));
      return {name,symbol:symbols[index],kind:'planet',longitude,speed,retrograde:speed<0,stationary:Math.abs(speed)<0.005,house:houseFor(longitude,cusps),...placement(longitude)};
    });
    const t=astro.MakeTime(date).tt/36525;
    const node=mod(125.0445479-1934.1362891*t+0.0020754*t*t+t*t*t/467441-t*t*t*t/60616000);
    for(const [name,symbol,longitude] of [['North Node','☊',node],['South Node','☋',mod(node+180)]]) points.push({name,symbol,kind:'node',longitude,speed:-0.0529539,retrograde:true,stationary:false,house:houseFor(longitude,cusps),...placement(longitude)});
    const axes=[['Ascendant','ASC',angles.asc],['Midheaven','MC',angles.mc],['Descendant','DSC',angles.dc],['Imum Coeli','IC',angles.ic]].map(([name,symbol,longitude])=>({name,symbol,kind:'angle',longitude,...placement(longitude),house:houseFor(longitude,cusps)}));
    const planets=points.filter(point=>point.kind==='planet');
    const balance={elements:Object.fromEntries(elements.map(name=>[name,planets.filter(point=>point.element===name).length])),qualities:Object.fromEntries(qualities.map(name=>[name,planets.filter(point=>point.quality===name).length]))};
    const illumination=astro.Illumination('Moon',date);
    return {status:'ready',date:date.toISOString(),timeZone:location.timeZone,location,houseSystem,notice,points,axes,cusps,angles,aspects:aspectsFor([...points,...axes.slice(0,2)],orbScale),orbScale,balance,moonIllumination:illumination.phase_fraction,moonPhase:astro.MoonPhase(date)};
  }
  function calculate({birthday,time,location,houseSystem='placidus',fold='',orbScale=1}) {
    if(!['placidus','whole-sign','equal'].includes(houseSystem)) houseSystem='placidus';
    if(![0.75,1,1.25].includes(Number(orbScale))) orbScale=1;
    orbScale=Number(orbScale);
    if(!time) return {status:'missing',message:'Add your birth time and select a birthplace to calculate your natal chart.'};
    if(!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude)>=90 || Math.abs(location.longitude)>180 || !location.timeZone) return {status:'missing',message:'Select a city suggestion, or enter coordinates and a time zone, to calculate your natal chart.'};
    let candidates;
    try {candidates=localTimeCandidates(birthday,time,location.timeZone);} catch(error) {return {status:'error',message:error.message};}
    if(!candidates.length) return {status:'error',message:'That local clock time did not occur because the clocks moved forward. Check the birth time.'};
    if(candidates.length>1 && !['earlier','later'].includes(fold)) return {status:'ambiguous',message:'This clock time occurred twice when daylight saving ended. Choose the earlier or later occurrence.',candidates};
    const resolved=candidates[fold==='later'?candidates.length-1:0],date=resolved.utc;
    const chart=chartAtInstant(date,location,{houseSystem,orbScale});
    if(chart.status!=='ready') return chart;
    return {...chart,birthday,time,offsetMinutes:resolved.offsetMinutes,ambiguousTime:candidates.length>1};
  }
  return {calculate,chartAtInstant,localTimeCandidates,anglesAt,houseCusps,houseFor,placement,aspectsFor,mod,delta,signNames,signGlyphs,aspectTypes};
})();
if(typeof module!=='undefined' && module.exports) module.exports=NatalEngine;
