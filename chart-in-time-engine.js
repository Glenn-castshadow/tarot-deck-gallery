/* Solar and lunar returns, and progressed charts, derived from a natal chart.
   Instants are solved here; the chart itself comes from the natal engine so
   houses, angles and the polar fallback stay identical to the birth chart. */
const ChartInTimeEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');

  const TROPICAL_YEAR = 365.2422, SIDEREAL_MONTH = 27.321582, DAY_MS = 86400000;
  const MIN_MS = Date.UTC(1901,0,1), MAX_MS = Date.UTC(2100,11,31,23,59,59,999);
  const TOLERANCE_SECONDS = 0.01;
  // Search converges on TIME, not longitude. At the Moon's maximum ~15.4 deg/day that
  // 0.01s is ~1.8e-6 deg, so a 1e-6 deg gate rejects perfectly good convergence (measured
  // at ~0.8% of lunar returns). This gate exists to catch a search that settled on the
  // WRONG crossing, which is wrong by whole degrees -- so 1e-5 deg admits every legitimate
  // solution with margin while staying five orders of magnitude tighter than any real failure.
  const MAX_RESIDUAL_DEGREES = 1e-5;
  const longitudeOf = (body,time) => astro.Ecliptic(astro.GeoVector(body,time,true)).elon;

  // The equation of centre can put the true Sun ~2 degrees (~2 days) away from a
  // mean-motion estimate, so a Newton step precedes the bracket. Both bodies are
  // prograde, so the crossing is ascending, which is what Search requires.
  function solveReturn(body, natalLongitude, seedMs) {
    // 8.64e15 ms is the maximum value a JS Date can represent.
    if (!Number.isFinite(seedMs) || Math.abs(seedMs) > 8.64e15) return null;
    const meanSpeed = 360 / (body === 'Sun' ? TROPICAL_YEAR : SIDEREAL_MONTH);
    const f = time => natal.delta(longitudeOf(body,time), natalLongitude);
    const seed = astro.MakeTime(new Date(seedMs));
    const corrected = seed.AddDays(-f(seed) / meanSpeed);
    const found = astro.Search(f, corrected.AddDays(-2), corrected.AddDays(2), {dt_tolerance_seconds:TOLERANCE_SECONDS});
    if (!found) return null;
    if (Math.abs(natal.delta(longitudeOf(body,found), natalLongitude)) > MAX_RESIDUAL_DEGREES) return null;
    return found.date;
  }

  function returnChart({chart, kind, location, index = 0, reference = new Date()}) {
    if (chart?.status !== 'ready') return {status:'missing',message:'Add your birth time and a confirmed birthplace above to calculate return charts.'};
    if (!['solar','lunar'].includes(kind)) return {status:'error',message:'Unknown return type.'};
    const place = location || chart.location;
    const body = kind === 'solar' ? 'Sun' : 'Moon';
    const period = kind === 'solar' ? TROPICAL_YEAR : SIDEREAL_MONTH;
    const natalLongitude = chart.points.find(point => point.name === body).longitude;
    const birthMs = +new Date(chart.date), referenceMs = +new Date(reference);
    if (!Number.isFinite(referenceMs)) return {status:'error',message:'Choose a valid date.'};

    // Seed the return number from mean motion, then settle it against the
    // reference so index 0 is always the return governing that moment.
    let k = Math.max(0, Math.floor((referenceMs - birthMs) / (period * DAY_MS)));
    for (let guard = 0; guard < 4; guard++) {
      const current = solveReturn(body, natalLongitude, birthMs + k * period * DAY_MS);
      if (!current) break;
      if (+current > referenceMs && k > 0) { k -= 1; continue; }
      const next = solveReturn(body, natalLongitude, birthMs + (k + 1) * period * DAY_MS);
      if (next && +next <= referenceMs) { k += 1; continue; }
      break;
    }
    k += index;
    if (k < 0) return {status:'error',message:'That would fall before the birth date.'};

    const moment = solveReturn(body, natalLongitude, birthMs + k * period * DAY_MS);
    if (!moment) return {status:'error',message:'This return could not be resolved. Try a nearer date.'};
    if (+moment < MIN_MS || +moment > MAX_MS) return {status:'error',message:'Return charts support dates from 1901 to 2100.'};

    const cast = natal.chartAtInstant(moment, place, {houseSystem:chart.houseSystem, orbScale:chart.orbScale});
    if (cast.status !== 'ready') return cast;
    return {status:'ready', kind, index, returnNumber:k, moment:moment.toISOString(),
      chart:cast, natalPoints:chart.points.filter(point => point.kind === 'planet'),
      contacts:contactsTo(cast.points.filter(point => point.kind === 'planet'), chart.points.filter(point => point.kind === 'planet'), 2)};
  }

  function contactsTo(moving, birth, orbLimit) {
    const contacts = [];
    for (const a of moving) for (const b of birth) {
      const separation = Math.abs(natal.delta(a.longitude, b.longitude));
      for (const type of natal.aspectTypes) {
        const orb = Math.abs(separation - type.angle);
        if (orb <= orbLimit) contacts.push({id:`${a.name}-${b.name}-${type.name}`, a:a.name, b:b.name,
          type:type.name, symbol:type.symbol, angle:type.angle, orb, limit:orbLimit,
          aLongitude:a.longitude, bLongitude:b.longitude});
      }
    }
    return contacts.sort((x,y) => x.orb - y.orb || x.id.localeCompare(y.id));
  }

  const PHASES = ['New','Crescent','First Quarter','Gibbous','Full','Disseminating','Last Quarter','Balsamic'];
  function lunationPhase(points) {
    const sun = points.find(point => point.name === 'Sun').longitude;
    const moon = points.find(point => point.name === 'Moon').longitude;
    const angle = natal.mod(moon - sun), index = Math.floor(angle / 45);
    return {angle, index, name:PHASES[index]};
  }

  function progressedChart({chart, targetDate, method = 'secondary'}) {
    if (chart?.status !== 'ready') return {status:'missing',message:'Add your birth time and a confirmed birthplace above to calculate progressed charts.'};
    if (!['secondary','tertiary','solar-arc'].includes(method)) return {status:'error',message:'Unknown progression method.'};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate || '')) return {status:'error',message:'Choose a valid calendar date.'};
    const target = new Date(`${targetDate}T12:00:00Z`);
    if (!Number.isFinite(+target) || target.toISOString().slice(0,10) !== targetDate) return {status:'error',message:'Choose a valid calendar date.'};
    if (+target < MIN_MS || +target > MAX_MS) return {status:'error',message:'Progressed charts support dates from 1901 to 2100.'};

    const birthMs = +new Date(chart.date);
    const elapsedDays = (+target - birthMs) / DAY_MS;
    // Solar arc needs the secondary progressed Sun, so only tertiary changes the ratio.
    const ratio = method === 'tertiary' ? SIDEREAL_MONTH : TROPICAL_YEAR;
    const progressedInstant = new Date(birthMs + (elapsedDays / ratio) * DAY_MS);
    const cast = natal.chartAtInstant(progressedInstant, chart.location, {houseSystem:chart.houseSystem, orbScale:chart.orbScale});
    if (cast.status !== 'ready') return cast;

    const base = {status:'ready', method, targetDate, elapsedDays, progressedInstant:progressedInstant.toISOString()};
    if (method !== 'solar-arc') return {...base, arc:null, points:cast.points, axes:cast.axes,
      cusps:cast.cusps, angles:cast.angles, lunation:lunationPhase(cast.points),
      contacts:contactsTo(cast.points.filter(point => point.kind === 'planet'), chart.points.filter(point => point.kind === 'planet'), 2)};

    // mod(), not delta(): the accumulated arc exceeds 180 degrees past age ~180
    // and delta() would wrap it to a negative value.
    const arc = natal.mod(cast.points.find(point => point.name === 'Sun').longitude - chart.points.find(point => point.name === 'Sun').longitude);
    // Directed points carry no meaningful daily motion, so speed is zeroed and
    // applying/separating is not reported for this method.
    const shift = point => {const longitude = natal.mod(point.longitude + arc); return {...point, longitude, speed:0, retrograde:false, stationary:false, house:natal.houseFor(longitude, chart.cusps), ...natal.placement(longitude)};};
    const points = chart.points.map(shift), axes = chart.axes.map(shift);
    return {...base, arc, points, axes, cusps:chart.cusps,
      angles:{asc:natal.mod(chart.angles.asc + arc), mc:natal.mod(chart.angles.mc + arc), dc:natal.mod(chart.angles.dc + arc), ic:natal.mod(chart.angles.ic + arc)},
      lunation:lunationPhase(points),
      contacts:contactsTo(points.filter(point => point.kind === 'planet'), chart.points.filter(point => point.kind === 'planet'), 1)};
  }

  return {solveReturn, returnChart, progressedChart, lunationPhase, contactsTo, TROPICAL_YEAR, SIDEREAL_MONTH};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ChartInTimeEngine;
