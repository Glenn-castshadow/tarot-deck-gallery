/* Techniques read off an existing natal chart: annual profections, the Part of Fortune and aspect
   patterns. Pure arithmetic on the chart in hand — no ephemeris calls, no DOM. Conventions and
   sources: docs/NATAL-CHART.md. */
const ChartDepthEngine = (() => {
  const classical = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const mod = (v, m = 360) => ((v % m) + m) % m;

  // Profections count WHOLE SIGN from the Ascendant, whatever house system the chart displays.
  // That is the technique's own convention; the page says so beside the result.
  function profection(chart, targetDate) {
    if (!chart || chart.status !== 'ready') return {status: 'missing'};
    if (!(targetDate instanceof Date) || !Number.isFinite(+targetDate)) throw new RangeError('Choose a valid date.');
    const [by, bm, bd] = String(chart.birthday).split('-').map(Number);
    const ty = targetDate.getFullYear(), tm = targetDate.getMonth() + 1, td = targetDate.getDate();
    // Completed years: birthday to birthday.
    let age = ty - by;
    if (tm < bm || (tm === bm && td < bd)) age -= 1;
    if (age < 0) throw new RangeError('Choose a date on or after the birth date.');
    const house = (age % 12) + 1;
    const ascSign = Math.floor(mod(chart.angles.asc) / 30);
    const signIndex = mod(ascSign + house - 1, 12);
    const from = new Date(by + age, bm - 1, bd);
    const to = new Date(by + age + 1, bm - 1, bd);
    return {status: 'ready', age, house, sign: SIGNS[signIndex], signIndex, lord: classical.rulers[signIndex], from, to};
  }

  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');

  // The traditional sect-sensitive pair. A lot of modern software uses the day formula for every
  // chart, which reflects the Lot across the Ascendant for night births; the page names which
  // formula was used.
  function fortuneLongitude(asc, sun, moon, sect) {
    if (sect === 'day') return mod(asc + moon - sun);
    if (sect === 'night') return mod(asc + sun - moon);
    throw new RangeError('Sect must be day or night.');
  }

  function partOfFortune(chart) {
    if (!chart || chart.status !== 'ready') return {status: 'missing'};
    const sun = chart.points.find(p => p.name === 'Sun');
    const moon = chart.points.find(p => p.name === 'Moon');
    const sect = classical.sect(chart);
    const longitude = fortuneLongitude(chart.angles.asc, sun.longitude, moon.longitude, sect);
    const place = natal.placement(longitude);
    return {
      status: 'ready', longitude, sign: place.sign, signIndex: place.index, degrees: place.degrees,
      house: natal.houseFor(longitude, chart.cusps), sect,
      formula: sect === 'day' ? 'Ascendant + Moon − Sun, for a day chart' : 'Ascendant + Sun − Moon, for a night chart'
    };
  }

  const PLANETS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

  // Patterns are found from majors AND minors together, whatever the display toggle says: a yod
  // needs quincunxes, and a pattern that appeared and vanished with a display toggle would be a bug.
  function patterns(aspects, points) {
    const planetary = aspects.filter(x => PLANETS.includes(x.a) && PLANETS.includes(x.b));
    const has = (a, b, type) => planetary.some(x => x.type === type && ((x.a === a && x.b === b) || (x.a === b && x.b === a)));
    const found = [];
    const sorted = names => [...names].sort();
    const key = (type, names) => `${type}:${sorted(names).join(',')}`;
    const seen = new Set();
    const add = (type, members, apex = null) => {
      const k = key(type, members);
      if (seen.has(k)) return;
      seen.add(k);
      found.push({type, members: sorted(members), apex});
    };

    // Stellium: three or more of the ten planets in one sign. The nodes and angles do not count.
    const bySign = new Map();
    for (const p of points.filter(p => p.kind === 'planet' && PLANETS.includes(p.name))) {
      const s = Math.floor(mod(p.longitude) / 30);
      bySign.set(s, [...(bySign.get(s) || []), p.name]);
    }
    for (const names of bySign.values()) if (names.length >= 3) add('Stellium', names);

    const names = PLANETS;
    // Grand cross first, so its constituent T-squares can be suppressed. Membership is tested
    // against the actual planet sets, not a joined string (a substring match on names would be
    // fragile if a future name were ever a substring of another).
    const crossSets = [];
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const [a, b] = [names[i], names[j]];
      if (!has(a, b, 'Opposition')) continue;
      for (let k = 0; k < names.length; k++) for (let l = k + 1; l < names.length; l++) {
        const [c, d] = [names[k], names[l]];
        if ([a, b].includes(c) || [a, b].includes(d) || !has(c, d, 'Opposition')) continue;
        if (has(a, c, 'Square') && has(c, b, 'Square') && has(b, d, 'Square') && has(d, a, 'Square')) {
          add('Grand cross', [a, b, c, d]);
          crossSets.push(new Set([a, b, c, d]));
        }
      }
    }
    const inCross = trio => crossSets.some(s => trio.every(n => s.has(n)));

    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) for (let k = j + 1; k < names.length; k++) {
      const [a, b, c] = [names[i], names[j], names[k]];
      if (has(a, b, 'Trine') && has(b, c, 'Trine') && has(a, c, 'Trine')) add('Grand trine', [a, b, c]);
      // T-square and yod: try each of the three as the apex.
      for (const [x, y, apex] of [[a, b, c], [a, c, b], [b, c, a]]) {
        if (has(x, y, 'Opposition') && has(x, apex, 'Square') && has(y, apex, 'Square') && !inCross([x, y, apex])) add('T-square', [x, y, apex], apex);
        if (has(x, y, 'Sextile') && has(x, apex, 'Quincunx') && has(y, apex, 'Quincunx')) add('Yod', [x, y, apex], apex);
      }
    }
    return found;
  }

  return {profection, fortuneLongitude, partOfFortune, patterns};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartDepthEngine;
