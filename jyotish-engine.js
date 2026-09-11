/* Sidereal (Jyotish) reading of a NatalEngine chart. Conventions: docs/JYOTISH.md. */
const JyotishEngine = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  // Lahiri as defined by the Swiss Ephemeris SIDM_LAHIRI mode: reference value at JD 2435553.5
  // carried by the IAU 2006 accumulated general precession in longitude (arcseconds, T in
  // Julian centuries from J2000). Calibrated (Task 2) to swe.get_ayanamsa_ut(2435553.5) from
  // pyswisseph 2.10.03 (Moshier, SIDM_LAHIRI) = 23.245560968496193, which differed from the
  // prior textbook constant (23.250182778) by 0.0046°, above the 0.0005° calibration tolerance.
  const AYANAMSA_T0 = 23.245560968496193, JD_T0 = 2435553.5, JD_J2000 = 2451545.0;
  const T0 = (JD_T0 - JD_J2000) / 36525;
  const precession = T => 5028.796195*T + 1.1054348*T*T + 0.00007964*T*T*T - 0.000023857*T*T*T*T;
  const centuries = date => ((+date) / 86400000 + 2440587.5 - JD_J2000) / 36525;
  function ayanamsa(date) {
    if (!(date instanceof Date) || !Number.isFinite(+date)) throw new RangeError('Choose a valid instant.');
    return AYANAMSA_T0 + (precession(centuries(date)) - precession(T0)) / 3600;
  }

  const rashis = [['Mesha','Aries'],['Vrishabha','Taurus'],['Mithuna','Gemini'],['Karka','Cancer'],['Simha','Leo'],['Kanya','Virgo'],['Tula','Libra'],['Vrischika','Scorpio'],['Dhanu','Sagittarius'],['Makara','Capricorn'],['Kumbha','Aquarius'],['Meena','Pisces']];
  const lordCycle = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
  const dashaYears = {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
  // Traditional names, presiding deities and symbols (data, not interpretation).
  const nakshatraTable = [
    ['Ashwini','Ashwini Kumaras','a horse’s head'],['Bharani','Yama','the yoni'],['Krittika','Agni','a blade or flame'],['Rohini','Prajapati','a cart or chariot'],['Mrigashira','Soma','a deer’s head'],['Ardra','Rudra','a teardrop'],['Punarvasu','Aditi','a bow and quiver'],['Pushya','Brihaspati','a cow’s udder'],['Ashlesha','the Nagas','a coiled serpent'],
    ['Magha','the Pitris','a throne'],['Purva Phalguni','Bhaga','the front legs of a bed'],['Uttara Phalguni','Aryaman','the back legs of a bed'],['Hasta','Savitr','a hand'],['Chitra','Tvashtar','a bright jewel'],['Swati','Vayu','a young shoot in the wind'],['Vishakha','Indra and Agni','a triumphal archway'],['Anuradha','Mitra','a lotus'],['Jyeshtha','Indra','a circular amulet'],
    ['Mula','Nirriti','a bundle of roots'],['Purva Ashadha','Apas','a winnowing fan'],['Uttara Ashadha','the Vishvadevas','an elephant’s tusk'],['Shravana','Vishnu','an ear, or three footprints'],['Dhanishta','the Vasus','a drum'],['Shatabhisha','Varuna','an empty circle'],['Purva Bhadrapada','Aja Ekapada','a sword'],['Uttara Bhadrapada','Ahir Budhnya','twins, or a funeral cot'],['Revati','Pushan','a fish']
  ];
  const nakshatras = nakshatraTable.map(([name,deity,symbol],index)=>({index,name,deity,symbol,lord:lordCycle[index%9]}));
  const SPAN = 360/27, PADA = SPAN/4;
  function nakshatraOf(longitude) {
    const l = natal.mod(longitude), index = Math.floor(l / SPAN) % 27, within = l - index * SPAN;
    return {index, name:nakshatras[index].name, lord:nakshatras[index].lord, pada:Math.min(4, Math.floor(within / PADA) + 1), fraction:within / SPAN};
  }
  function navamsaSign(longitude) {
    const l = natal.mod(longitude), s = Math.floor(l / 30), k = Math.min(8, Math.floor((l - s * 30) / (30 / 9)));
    return (9 * s + k) % 12;
  }
  const degreesText = l => { const minutes = Math.floor((l % 30) * 60); return `${Math.floor(minutes/60)}°${String(minutes%60).padStart(2,'0')}′`; };
  const grahaOrder = [['Sun','Su'],['Moon','Mo'],['Mars','Ma'],['Mercury','Me'],['Jupiter','Ju'],['Venus','Ve'],['Saturn','Sa'],['North Node','Ra'],['South Node','Ke']];
  const grahaNames = {'North Node':'Rahu','South Node':'Ketu'};
  function sidereal(chart) {
    if (!chart || chart.status !== 'ready') return {status:'missing', message:'Add a birth date, recorded time and confirmed birthplace to read the sidereal chart.'};
    const ayan = ayanamsa(new Date(chart.date));
    const place = lon => { const l = natal.mod(lon - ayan), signIndex = Math.floor(l / 30); return {longitude:l, signIndex, sign:rashis[signIndex][0], western:rashis[signIndex][1], degrees:degreesText(l), nakshatra:nakshatraOf(l), navamsaSign:navamsaSign(l)}; };
    const lagna = place(chart.axes.find(a => a.name === 'Ascendant').longitude);
    const grahas = grahaOrder.map(([name, abbreviation]) => {
      const p = chart.points.find(x => x.name === name), s = place(p.longitude);
      return {name:grahaNames[name] || name, abbreviation, ...s, house:natal.mod(s.signIndex - lagna.signIndex, 12) + 1, retrograde:p.kind === 'node' ? true : Boolean(p.retrograde), vargottama:s.signIndex === s.navamsaSign};
    });
    const navamsaLagna = {signIndex:lagna.navamsaSign, sign:rashis[lagna.navamsaSign][0], western:rashis[lagna.navamsaSign][1]};
    const wheel = (lagnaSign, key) => Array.from({length:12}, (_, i) => { const signIndex = (lagnaSign + i) % 12; return {index:i + 1, signIndex, sign:rashis[signIndex][0], western:rashis[signIndex][1], grahas:grahas.filter(g => g[key] === signIndex).map(g => g.name)}; });
    return {status:'ready', ayanamsa:ayan, lagna, grahas, navamsaLagna, houses:wheel(lagna.signIndex, 'signIndex'), navamsaHouses:wheel(navamsaLagna.signIndex, 'navamsaSign')};
  }
  const YEAR_MS = 365.25 * 86400000;
  function vimshottari(chart, todayValue) {
    const model = sidereal(chart);
    if (model.status !== 'ready') return model;
    const moon = model.grahas.find(g => g.name === 'Moon'), nk = moon.nakshatra;
    const birth = +new Date(chart.date), startIndex = lordCycle.indexOf(nk.lord);
    const balanceYears = (1 - nk.fraction) * dashaYears[nk.lord];
    let cursor = birth - nk.fraction * dashaYears[nk.lord] * YEAR_MS;
    const iso = ms => new Date(ms).toISOString();
    const mahadashas = [];
    for (let i = 0; i < 9; i++) {
      const lord = lordCycle[(startIndex + i) % 9], years = dashaYears[lord], start = cursor, end = cursor + years * YEAR_MS;
      const antardashas = []; let sub = start;
      for (let j = 0; j < 9; j++) {
        const subLord = lordCycle[(startIndex + i + j) % 9], subYears = years * dashaYears[subLord] / 120, subEnd = sub + subYears * YEAR_MS;
        antardashas.push({lord:subLord, years:subYears, start:iso(Math.max(sub, birth)), end:iso(subEnd), beforeBirth:subEnd <= birth});
        sub = subEnd;
      }
      mahadashas.push({lord, years, start:iso(Math.max(start, birth)), end:iso(end), notionalStart:iso(start), antardashas});
      cursor = end;
    }
    let current = null;
    const today = typeof todayValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayValue) ? +new Date(`${todayValue}T12:00:00Z`) : NaN;
    if (Number.isFinite(today) && today >= birth) {
      const mi = mahadashas.findIndex(m => today >= +new Date(m.notionalStart) && today < +new Date(m.end));
      if (mi >= 0) { const ai = mahadashas[mi].antardashas.findIndex(a => today < +new Date(a.end)); current = {maha:mi, antar:Math.max(ai, 0)}; }
    }
    return {status:'ready', moonNakshatra:nk, balanceYears, mahadashas, current};
  }
  return {AYANAMSA_T0, ayanamsa, nakshatraOf, navamsaSign, sidereal, vimshottari, nakshatras, rashis, lordCycle, dashaYears, grahaOrder};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = JyotishEngine;
