/* Relationship charts built from two birth charts: the composite (a chart of midpoints) and the
   Davison (the real sky at the midpoint in time and place). Arithmetic on two ready charts plus one
   chartAtInstant call; no DOM. Conventions and sources: docs/EXTENDED-ATLAS.md. */
const RelationshipChartsEngine = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const {mod, delta} = natal;
  const MISSING = 'Both people need a birth date, recorded time and confirmed birthplace.';
  const QUADRANT = ['placidus', 'regiomontanus'];
  const ready = (a, b) => a?.status === 'ready' && b?.status === 'ready';
  // An arc from 0 to 360, with float noise just under 360 read as 0.
  const arc = value => { const v = mod(value); return v > 360 - 1e-7 ? 0 : v; };

  function nearMidpoint(a, b) {
    const span = delta(b, a);
    // delta returns −180 at exact opposition; test both signs so the rule never rests on that.
    if (Math.abs(Math.abs(span) - 180) < 1e-9) return mod(a + 90);
    return mod(a + span / 2);
  }

  function composite(first, second) {
    if (!ready(first, second)) return {status: 'missing', message: MISSING};
    const mc = nearMidpoint(first.angles.mc, second.angles.mc);
    let asc = nearMidpoint(first.angles.asc, second.angles.asc);
    // Every natal Ascendant lies east of its Midheaven; the midpoint of two can land on the wrong side.
    const east = mod(asc - mc);
    if (!(east > 0 && east < 180)) asc = mod(asc + 180);

    let houseSystem = first.houseSystem, notice = '', cusps;
    if (first.houseSystem !== second.houseSystem) {
      // A Whole Sign chart with a notice is chartAtInstant's Placidus fallback, not a choice the reader made.
      const fellBack = chart => chart.houseSystem === 'whole-sign' && Boolean(chart.notice);
      if (fellBack(first) || fellBack(second)) {
        houseSystem = 'whole-sign';
        notice = 'Placidus houses cannot be drawn for one of the two birthplaces, so this composite uses Whole Sign houses from the composite Ascendant.';
      } else {
        houseSystem = 'equal';
        notice = 'The two charts use different house systems, so this composite uses Equal houses from the composite Ascendant.';
      }
    }
    if (QUADRANT.includes(houseSystem)) {
      cusps = first.cusps.map((cuspA, i) => {
        const cuspB = second.cusps[i];
        // Where this cusp sits from the Ascendant, on average; keep the midpoint on that side.
        const offset = (arc(cuspA - first.angles.asc) + arc(cuspB - second.angles.asc)) / 2;
        const target = mod(asc + offset), m = nearMidpoint(cuspA, cuspB);
        return Math.abs(delta(m, target)) <= 90 ? m : mod(m + 180);
      });
    } else {
      cusps = natal.houseCusps({asc, mc}, 0, houseSystem);
    }

    const secondByName = Object.fromEntries(second.points.filter(p => p.kind === 'planet').map(p => [p.name, p]));
    const points = first.points.filter(p => p.kind === 'planet').map(p => {
      const longitude = nearMidpoint(p.longitude, secondByName[p.name].longitude);
      return {name: p.name, symbol: p.symbol, kind: 'planet', speed: 0, retrograde: false, stationary: false, house: natal.houseFor(longitude, cusps), ...natal.placement(longitude)};
    });
    const axes = [['Ascendant', 'ASC', asc], ['Midheaven', 'MC', mc], ['Descendant', 'DSC', mod(asc + 180)], ['Imum Coeli', 'IC', mod(mc + 180)]]
      .map(([name, symbol, longitude]) => ({name, symbol, kind: 'angle', ...natal.placement(longitude), house: natal.houseFor(longitude, cusps)}));
    // Composite placements never move, so applying and separating mean nothing here.
    const aspects = natal.aspectsFor([...points, ...axes.slice(0, 2)], first.orbScale).map(a => ({...a, applying: null}));
    return {status: 'ready', method: 'composite', houseSystem, notice, orbScale: first.orbScale,
      angles: {asc, mc, dc: mod(asc + 180), ic: mod(mc + 180)}, points, axes, cusps, aspects, minorAspects: []};
  }

  function davison(first, second) {
    if (!ready(first, second)) return {status: 'missing', message: MISSING};
    const instant = new Date((Date.parse(first.date) + Date.parse(second.date)) / 2);
    const east = nearMidpoint(first.location.longitude, second.location.longitude);
    const location = {
      latitude: (first.location.latitude + second.location.latitude) / 2,
      longitude: east > 180 ? east - 360 : east,
      timeZone: 'UTC',
      label: 'Davison midpoint'
    };
    // A notice only ever marks the Placidus fallback (the birth form offers no other system that falls
    // back), so recast in the Placidus the reader chose; chartAtInstant falls back again if it must.
    const houseSystem = first.notice ? 'placidus' : first.houseSystem;
    const chart = natal.chartAtInstant(instant, location, {houseSystem, orbScale: first.orbScale});
    if (chart.status !== 'ready') return chart;
    // The composite has no nodes; leave them out of the Davison chart, wheel included, so both read alike.
    const isNode = name => chart.points.some(p => p.kind === 'node' && p.name === name);
    const withoutNodes = list => list.filter(a => !isNode(a.a) && !isNode(a.b));
    return {...chart, method: 'davison', points: chart.points.filter(p => p.kind !== 'node'),
      aspects: withoutNodes(chart.aspects), minorAspects: withoutNodes(chart.minorAspects)};
  }

  return {nearMidpoint, composite, davison};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RelationshipChartsEngine;
