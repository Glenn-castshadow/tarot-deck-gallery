/* Three techniques read off an existing natal chart: the seven Hermetic lots, firdaria, and
   zodiacal releasing. Pure arithmetic on the chart's longitudes and birth instant: no ephemeris
   calls, no DOM. Conventions and sources: docs/NATAL-CHART.md. */
const TimeLordsEngine = (() => {
  const classical = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const SIGNS = natal.signNames, mod = natal.mod, DAY = 86400000;
  const ready = chart => !!chart && chart.status === 'ready';
  const lon = (chart, name) => chart.points.find(p => p.name === name).longitude;

  /* ---- The seven Hermetic lots (Paulus Alexandrinus, Introduction, ch. 23) ----------------
     Each lot is the arc from one point to another, laid off from the Ascendant. Every formula
     is given for a day chart and reverses for a night chart. Five of the seven are built on
     Fortune or Spirit, which are themselves taken in their sect-appropriate form. */
  const LOTS = [
    {name: 'Fortune', planet: 'Moon', from: 'Sun', to: 'Moon', matter: 'the body, circumstance and material life'},
    {name: 'Spirit', planet: 'Sun', from: 'Moon', to: 'Sun', matter: 'the mind, intention and what one sets out to do'},
    {name: 'Eros', planet: 'Venus', from: 'Spirit', to: 'Venus', matter: 'desire and what one is drawn towards'},
    {name: 'Necessity', planet: 'Mercury', from: 'Mercury', to: 'Fortune', matter: 'constraint, struggle and what cannot be avoided'},
    {name: 'Courage', planet: 'Mars', from: 'Mars', to: 'Fortune', matter: 'boldness, daring and risk'},
    {name: 'Victory', planet: 'Jupiter', from: 'Spirit', to: 'Jupiter', matter: 'trust, success and help received'},
    {name: 'Nemesis', planet: 'Saturn', from: 'Saturn', to: 'Fortune', matter: 'what is hidden, endings and consequences'}
  ];
  function lots(chart) {
    if (!ready(chart)) return {status: 'missing'};
    const sect = classical.sect(chart), asc = chart.angles.asc, found = {};
    const at = name => name in found ? found[name] : lon(chart, name);
    const list = LOTS.map(lot => {
      const [from, to] = sect === 'day' ? [lot.from, lot.to] : [lot.to, lot.from];
      const longitude = mod(asc + at(to) - at(from));
      found[lot.name] = longitude;
      const place = natal.placement(longitude);
      return {name: lot.name, planet: lot.planet, matter: lot.matter, longitude, sign: place.sign, signIndex: place.index, degrees: place.degrees,
        house: natal.houseFor(longitude, chart.cusps), formula: `Ascendant + ${to} − ${from}`};
    });
    return {status: 'ready', sect, lots: list};
  }

  /* ---- Firdaria ---------------------------------------------------------------------------
     Seventy-five years shared among the seven planets and the two lunar nodes. A day chart
     begins with the Sun and a night chart with the Moon; both then follow the same descending
     order. Each planet's period is cut into seven equal parts, the first belonging to the
     period's own lord and the rest following in that same order. The nodes are not divided. */
  const FIRDAR_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
  const FIRDAR_YEARS = {Sun: 10, Venus: 8, Mercury: 13, Moon: 9, Saturn: 11, Jupiter: 12, Mars: 7, 'North Node': 3, 'South Node': 2};
  const NODES = ['North Node', 'South Node'];
  const firdarSequence = sect => {
    const start = FIRDAR_ORDER.indexOf(sect === 'day' ? 'Sun' : 'Moon');
    return FIRDAR_ORDER.map((_, i) => FIRDAR_ORDER[(start + i) % 7]).concat(NODES);
  };
  // A whole number of years after the birth instant, birthday to birthday.
  function yearsAfter(birth, years) {
    const d = new Date(+birth);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d;
  }
  function firdaria(chart, now = new Date()) {
    if (!ready(chart)) return {status: 'missing'};
    const sect = classical.sect(chart), birth = new Date(chart.date), sequence = firdarSequence(sect);
    // The cycle of seventy-five years that holds `now`; the first cycle for a date before birth.
    let cycle = 0;
    while (+yearsAfter(birth, (cycle + 1) * 75) <= +now) cycle++;
    let age = cycle * 75;
    const periods = sequence.map(lord => {
      const start = yearsAfter(birth, age), end = yearsAfter(birth, age + FIRDAR_YEARS[lord]), fromAge = age;
      age += FIRDAR_YEARS[lord];
      const first = FIRDAR_ORDER.indexOf(lord), length = (+end - +start) / 7;
      const subs = first < 0 ? [] : FIRDAR_ORDER.map((_, i) => ({lord: FIRDAR_ORDER[(first + i) % 7], start: new Date(+start + i * length), end: new Date(+start + (i + 1) * length)}));
      return {lord, years: FIRDAR_YEARS[lord], fromAge, toAge: age, start, end, subs};
    });
    const within = p => +now >= +p.start && +now < +p.end;
    const current = periods.find(within) || null;
    return {status: 'ready', sect, cycle, periods, current, currentSub: current ? current.subs.find(within) || null : null};
  }

  /* ---- Zodiacal releasing (Vettius Valens, Anthology IV) -----------------------------------
     Time is released from the sign holding a lot, sign by sign in zodiacal order. Each sign
     gives the count belonging to its ruler: years of 360 days at the first level, months of 30
     days at the second. A second-level run begins in its first-level sign; if it gets all the
     way round the zodiac (211 months) before the first-level period ends, it does not start the
     circle again but jumps to the sign opposite and carries on from there: the loosing of the
     bond. */
  const ZR_COUNT = [15, 8, 20, 25, 19, 20, 8, 15, 12, 27, 30, 12];   // Aries … Pisces
  const ZR_YEAR = 360 * DAY, ZR_MONTH = 30 * DAY;
  // A peak is a sign that is the first, fourth, seventh or tenth from the Lot of Fortune's sign,
  // counting whole signs. Some authors rank the four; the sources checked do not agree, so this
  // does not.
  function peakOf(signIndex, fortuneSign) {
    return Number.isInteger(fortuneSign) && mod(signIndex - fortuneSign, 12) % 3 === 0;
  }
  // Where each releasing begins. When Spirit and Fortune share a sign, Spirit is released from
  // the next sign on, so the two do not run the same sequence.
  function releasingStarts(fortuneLongitude, spiritLongitude) {
    const fortune = Math.floor(mod(fortuneLongitude) / 30), spirit = Math.floor(mod(spiritLongitude) / 30), moved = spirit === fortune;
    return {fortune, spirit: moved ? mod(spirit + 1, 12) : spirit, moved};
  }
  function subPeriods(parent, fortuneSign) {
    const out = [];
    let sign = parent.signIndex, start = +parent.start, released = 0, loosed = false;
    while (start < +parent.end) {
      let loosing = false;
      if (released === 12 && !loosed) { sign = mod(parent.signIndex + 6, 12); loosed = loosing = true; }
      const end = Math.min(start + ZR_COUNT[sign] * ZR_MONTH, +parent.end);
      out.push({level: 2, signIndex: sign, sign: SIGNS[sign], lord: classical.rulers[sign], start: new Date(start), end: new Date(end), loosing, peak: peakOf(sign, fortuneSign)});
      start = end; sign = mod(sign + 1, 12); released++;
    }
    return out;
  }
  // lotLongitude: the lot being released from. fortuneLongitude: where peaks are counted from.
  // Covers at least `years` calendar years from birth.
  function zodiacalReleasing(chart, lotLongitude, {fortuneLongitude = null, now = new Date(), years = 110} = {}) {
    if (!ready(chart)) return {status: 'missing'};
    if (!Number.isFinite(lotLongitude)) throw new RangeError('Choose a lot to release from.');
    const birth = new Date(chart.date), horizon = +birth + years * 365.25 * DAY;
    const fortuneSign = Number.isFinite(fortuneLongitude) ? Math.floor(mod(fortuneLongitude) / 30) : null;
    const periods = [];
    let sign = Math.floor(mod(lotLongitude) / 30), start = +birth;
    while (start < horizon) {
      const end = start + ZR_COUNT[sign] * ZR_YEAR;
      const period = {level: 1, signIndex: sign, sign: SIGNS[sign], lord: classical.rulers[sign], start: new Date(start), end: new Date(end), peak: peakOf(sign, fortuneSign)};
      period.subs = subPeriods(period, fortuneSign);
      periods.push(period);
      start = end; sign = mod(sign + 1, 12);
    }
    const within = p => +now >= +p.start && +now < +p.end;
    const current = periods.find(within) || null;
    return {status: 'ready', startSign: periods[0].sign, periods, current, currentSub: current ? current.subs.find(within) || null : null};
  }

  return {LOTS, lots, FIRDAR_ORDER, FIRDAR_YEARS, firdarSequence, firdaria, ZR_COUNT, peakOf, releasingStarts, zodiacalReleasing};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TimeLordsEngine;
