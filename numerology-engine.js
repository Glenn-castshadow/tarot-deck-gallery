/* Modern Pythagorean conventions, explicitly chosen for this site. See docs/NUMEROLOGY.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NumerologyEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const masters = [11,22,33];
  const digitSum = n => [...String(n)].reduce((sum,ch)=>sum+Number(ch),0);
  function reduce(value, keepMasters = true) {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError('Use a positive whole number.');
    const steps = [value];
    while(value > 9 && !(keepMasters && masters.includes(value))) {value=digitSum(value);steps.push(value);}
    return {value,root:value>9?digitSum(value):value,master:masters.includes(value),steps};
  }
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const date = new Date(`${value}T12:00:00Z`);
    if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value||date.getUTCFullYear()<1) return null;
    const [year,month,day]=value.split('-').map(Number);
    return {year,month,day,value};
  }
  const dateKey = (year,month,day) => `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  function birthday(value) {
    const parts = parseDate(value);
    if(!parts) throw new RangeError('Choose a valid birthday.');
    const components=[reduce(parts.month),reduce(parts.day),reduce(parts.year)];
    return {parts,components,path:reduce(components.reduce((sum,n)=>sum+n.value,0)),birthDay:reduce(parts.day),attitude:reduce(parts.month+parts.day,false)};
  }
  function cycleYear(birth, year) {
    if(!Number.isInteger(year)||year<1||year>9999) throw new RangeError('Choose a valid year.');
    return reduce(birth.parts.month+birth.parts.day+year,false);
  }
  function cycles(birth, value) {
    const date=parseDate(value);
    if(!date) throw new RangeError('Choose a valid calendar date.');
    if(value<birth.parts.value) throw new RangeError('Choose a date on or after your birthday.');
    const year=cycleYear(birth,date.year),month=reduce(year.value+date.month,false),day=reduce(month.value+date.day,false);
    const start=date.year-year.value+1;
    const years=Array.from({length:9},(_,i)=>({year:start+i,number:i+1}));
    const months=Array.from({length:12},(_,i)=>({month:i+1,number:reduce(year.value+i+1,false).value}));
    return {date,year,month,day,years,months};
  }
  function dateInMonth(value, year, month, minDate='0001-01-01', maxDate='2100-12-31') {
    const parsed=parseDate(value);
    if(!parsed||!Number.isInteger(year)||year<1||year>9999||!Number.isInteger(month)||month<1||month>12) throw new RangeError('Choose a valid month and year.');
    let day=parsed.day;
    while(!parseDate(dateKey(year,month,day))) day--;
    const candidate=dateKey(year,month,day);
    return candidate<minDate?minDate:candidate>maxDate?maxDate:candidate;
  }
  function normalizeName(raw) {
    const text=String(raw || '').trim();
    if(text.length>120) return {status:'invalid',message:'Use a name of 120 characters or fewer.'};
    // Diacritics are removed. Explicit Latin transliterations are shown before calculation.
    const normalized=text.replace(/[ßẞ]/g,'ss').replace(/[Ææ]/g,'ae').replace(/[Œœ]/g,'oe').replace(/[Øø]/g,'o').replace(/[Łł]/g,'l').replace(/[ĐđÐð]/g,'d').replace(/[Þþ]/g,'th').normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase();
    if(/[^A-Z\s.'’\-]/u.test(normalized)) return {status:'invalid',message:'Use an A–Z spelling or transliteration. Accents, spaces, apostrophes, periods and hyphens are supported; other characters need a spelling you choose.'};
    const words=normalized.split(/[\s.'’\-]+/).filter(Boolean);
    let index=0;
    const letters=words.flatMap((word,wordIndex)=>[...word].map(letter=>({letter,value:(letter.charCodeAt(0)-65)%9+1,index:index++,word,wordIndex})));
    if(!letters.length) return {status:'empty',message:'Enter a name to open its number reading.'};
    return {status:'ready',normalized:words.join(' '),letters,ys:letters.filter(x=>x.letter==='Y')};
  }
  function nameProfile(raw, yVowels=[], birth=null) {
    const result=normalizeName(raw);
    if(result.status!=='ready') return result;
    const selected=new Set(yVowels), letters=result.letters.map(item=>({...item,vowel:'AEIOU'.includes(item.letter)||(item.letter==='Y'&&selected.has(item.index))}));
    const total=letters.reduce((sum,x)=>sum+x.value,0),vowels=letters.filter(x=>x.vowel).reduce((sum,x)=>sum+x.value,0),consonants=total-vowels;
    const expression=reduce(total),soul=vowels?reduce(vowels):null,personality=consonants?reduce(consonants):null;
    return {...result,letters,totals:{expression:total,soul:vowels,personality:consonants},expression,soul,personality,maturity:birth?reduce(birth.path.value+expression.value):null};
  }
  return {reduce,parseDate,dateKey,birthday,cycles,cycleYear,dateInMonth,normalizeName,nameProfile};
});
