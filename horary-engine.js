/* Casting the horary question chart: Lilly's considerations before judgment, significators,
   and perfection by aspect, reception, translation and collection (Christian Astrology, 1647). */
const HoraryEngine = (() => {
  const astro = typeof Astronomy !== 'undefined' ? Astronomy : require('./vendor/astronomy-engine/astronomy.js');
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const C = typeof ClassicalEngine !== 'undefined' ? ClassicalEngine : require('./classical-engine.js');

  const aspects = [0, 60, 90, 120, 180];

  // Standard English ordinal suffix, mirroring classical-engine.js's helper (kept local here
  // rather than imported, since classical-engine.js does not export it) -- the general
  // 11/12/13 exception handling, not the brief's Step-2 lookup-table shortcut.
  function ordinal(n) {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  }

  function applyingAspect(a, b) {
    const separation = Math.abs(natal.delta(a.longitude, b.longitude));
    let best = null;
    for (const aspect of aspects) { const orb = Math.abs(separation - aspect); if (!best || orb < best.orb) best = { aspect, orb }; }
    const moiety = ((C.orbs[a.name] || 7) + (C.orbs[b.name] || 7)) / 2;
    const later = Math.abs(natal.delta(a.longitude + a.speed / 24, b.longitude + b.speed / 24));
    const applying = Math.abs(later - best.aspect) < best.orb;
    return { aspect: best.orb <= moiety ? best.aspect : null, orb: best.orb, moiety, withinOrb: best.orb <= moiety, applying, separation };
  }

  function perfects(a, b, aspect, chart) {
    // The instant the aspect becomes exact, if within 30 days and before either planet
    // changes sign. Astronomy Engine's Search only finds ascending zero-crossings, so both
    // chiralities of a non-conjunction/opposition aspect (leading vs. trailing) are searched
    // by negating the target; this also covers retrograde pairs, where the crossing direction
    // can otherwise go the "wrong" way.
    const t0 = astro.MakeTime(new Date(chart.date)), lon = (n, t) => astro.Ecliptic(astro.GeoVector(n, t, true)).elon;
    const sign = x => Math.floor(natal.mod(x) / 30);
    for (const s of (aspect === 0 || aspect === 180 ? [1] : [1, -1])) {
      const g = t => natal.delta(lon(a.name, t) - lon(b.name, t), s * aspect);
      for (let x = t0; x.ut < t0.ut + 30; x = x.AddDays(0.5)) {
        const y = x.AddDays(0.5), ga = g(x), gb = g(y);
        if ((ga < 0 && gb >= 0 || ga > 0 && gb <= 0) && Math.abs(gb - ga) < 45) {
          const hit = astro.Search(ga < 0 ? g : t => -g(t), x, y, { dt_tolerance_seconds: 1 });
          if (hit) return { date: hit.date.toISOString(), beforeSignChange: sign(lon(a.name, hit)) === sign(a.longitude) && sign(lon(b.name, hit)) === sign(b.longitude) };
        }
      }
    }
    return null;
  }

  function significatorFor(chart, house) {
    const cuspSign = Math.floor(natal.mod(chart.cusps[house - 1]) / 30);
    return { planet: C.rulers[cuspSign], sign: natal.signNames[cuspSign], house, why: `ruler of ${natal.signNames[cuspSign]} on the cusp of the ${ordinal(house)} house` };
  }

  function translation(chart, nameA, nameB) {
    const A = chart.points.find(p => p.name === nameA), B = chart.points.find(p => p.name === nameB);
    for (const P of chart.points.filter(p => C.planets.includes(p.name) && p.name !== nameA && p.name !== nameB)) {
      if (Math.abs(P.speed) <= Math.abs(A.speed) || Math.abs(P.speed) <= Math.abs(B.speed)) continue;
      const toA = applyingAspect(P, A), toB = applyingAspect(P, B);
      if (toA.aspect !== null && !toA.applying && toB.aspect !== null && toB.applying) return { planet: P.name, from: nameA, to: nameB };
      if (toB.aspect !== null && !toB.applying && toA.aspect !== null && toA.applying) return { planet: P.name, from: nameB, to: nameA };
    }
    return null;
  }

  function collection(chart, nameA, nameB) {
    const A = chart.points.find(p => p.name === nameA), B = chart.points.find(p => p.name === nameB);
    for (const P of chart.points.filter(p => C.planets.includes(p.name) && p.name !== nameA && p.name !== nameB)) {
      if (Math.abs(P.speed) >= Math.abs(A.speed) || Math.abs(P.speed) >= Math.abs(B.speed)) continue;
      const fromA = applyingAspect(A, P), fromB = applyingAspect(B, P);
      if (fromA.aspect !== null && fromA.applying && fromB.aspect !== null && fromB.applying) return { planet: P.name };
    }
    return null;
  }

  function cast({ date, location, houseMatter }) {
    if (!Number.isInteger(houseMatter) || houseMatter < 1 || houseMatter > 12) throw new RangeError('Choose a house from 1 to 12.');
    const chart = natal.chartAtInstant(date, location, { houseSystem: 'regiomontanus' });
    if (chart.status !== 'ready') return chart;
    const sect = C.sect(chart), hour = C.planetaryHours(new Date(chart.date), location), moon = C.moonCondition(chart);
    const ascSign = Math.floor(chart.angles.asc / 30), ascDegree = chart.angles.asc - ascSign * 30;
    const querent = { ...significatorFor(chart, 1), why: `ruler of the Ascendant, ${natal.signNames[ascSign]}` };
    let quesited = significatorFor(chart, houseMatter);
    if (houseMatter !== 1 && quesited.planet === querent.planet) {
      const s = Math.floor(natal.mod(chart.cusps[houseMatter - 1]) / 30);
      const ex = Object.entries(C.exaltations).find(([, v]) => v[0] === s);
      if (ex) {
        quesited = { ...quesited, planet: ex[0], why: `${quesited.why}; the sign’s ruler already signifies the querent, so its exaltation ruler stands for the quesited, as Lilly allowed` };
      } else {
        quesited = { ...quesited, shared: true };
      }
    }
    const saturnHouse = natal.houseFor(chart.points.find(p => p.name === 'Saturn').longitude, chart.cusps);
    const tripRuler = C.triplicities[ascSign % 4][sect === 'day' ? 0 : 1];
    const considerations = [
      { key: 'ascEarly', present: ascDegree < 3, detail: `Ascendant at ${ascDegree.toFixed(1)}° of ${natal.signNames[ascSign]}` },
      { key: 'ascLate', present: ascDegree > 27, detail: `Ascendant at ${ascDegree.toFixed(1)}° of ${natal.signNames[ascSign]}` },
      { key: 'saturnAngular', present: saturnHouse === 1 || saturnHouse === 7, detail: `Saturn in the ${ordinal(saturnHouse)} house` },
      { key: 'moonVoid', present: moon.voidOfCourse, detail: moon.nextAspect ? `the Moon next perfects a ${moon.nextAspect.aspect}° aspect with ${moon.nextAspect.planet}` : 'the Moon perfects no aspect before leaving its sign' },
      { key: 'viaCombusta', present: moon.viaCombusta, detail: 'Moon between 15° Libra and 15° Scorpio' },
      { key: 'radical', present: hour.status === 'ready' && (hour.hours[hour.current]?.ruler === querent.planet || hour.hours[hour.current]?.ruler === tripRuler), detail: hour.status === 'ready' ? `hour of ${hour.hours[hour.current]?.ruler}; Ascendant ruler ${querent.planet}, triplicity ruler ${tripRuler}` : 'planetary hour undefined here' },
    ];
    const P = name => chart.points.find(p => p.name === name);
    const sig = (s, name) => ({ ...s, point: P(name), essential: C.dignities(name, P(name).longitude, sect), accidental: C.accidental(P(name), chart) });
    const significators = { querent: sig(querent, querent.planet), moon: sig({ planet: 'Moon', why: 'co-significator of the querent and of the matter' }, 'Moon'), quesited: sig(quesited, quesited.planet) };
    const pairs = [['querent', 'quesited'], ['moon', 'quesited'], ['querent', 'moon']];
    const aspectsOut = pairs.filter(([x, y]) => significators[x].planet !== significators[y].planet).map(([x, y]) => {
      const a = significators[x].point, b = significators[y].point, r = applyingAspect(a, b);
      const p = r.aspect !== null && r.applying ? perfects(a, b, r.aspect, chart) : null;
      return { a: a.name, b: b.name, roles: [x, y], ...r, perfects: p?.date || null, beforeSignChange: p?.beforeSignChange ?? null };
    });
    const receptions = [['querent', 'quesited'], ['quesited', 'querent']].filter(([x, y]) => significators[x].planet !== significators[y].planet).map(([x, y]) => ({ from: significators[x].planet, to: significators[y].planet, ...C.reception(significators[x].planet, significators[y].planet, chart) }));
    const main = aspectsOut.find(x => x.roles.includes('querent') && x.roles.includes('quesited'));
    const perfection = {
      byAspect: Boolean(main && main.aspect !== null && main.applying && main.beforeSignChange),
      byReception: receptions.length === 2 && receptions.every(r => r.any),
      translation: significators.querent.planet !== significators.quesited.planet ? translation(chart, significators.querent.planet, significators.quesited.planet) : null,
      collection: significators.querent.planet !== significators.quesited.planet ? collection(chart, significators.querent.planet, significators.quesited.planet) : null,
    };
    return { status: 'ready', chart, sect, hour, moon, considerations, significators, receptions, aspects: aspectsOut, perfection, houseMatter };
  }

  return { cast, significatorFor, applyingAspect, perfects, translation, collection };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HoraryEngine;
